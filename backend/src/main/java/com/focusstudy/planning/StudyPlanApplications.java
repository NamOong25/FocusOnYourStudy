package com.focusstudy.planning;

import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.ObjectMapper;

@Repository
public class StudyPlanApplications {
    private final JdbcTemplate jdbc;private final ObjectMapper json;
    public StudyPlanApplications(JdbcTemplate jdbc,ObjectMapper json){this.jdbc=jdbc;this.json=json;}
    record Receipt(String hash,StudyPlanApplication value) { }
    @Transactional(propagation=Propagation.MANDATORY,readOnly=true)
    public Optional<Receipt> find(UUID owner,UUID key){
        return jdbc.query("SELECT request_hash, response_json::text FROM study_plan_applications WHERE user_id=? AND client_request_id=?",
                (rs,n)->new Receipt(rs.getString(1),json.readValue(rs.getString(2),StudyPlanApplication.class)),owner,key).stream().findFirst();
    }
    @Transactional(propagation=Propagation.MANDATORY)
    public void insert(UUID owner,String hash,StudyPlanApplication value){
        jdbc.update("INSERT INTO study_plan_applications(id,user_id,client_request_id,request_hash,applied_at,response_json) VALUES (?,?,?,?,?,CAST(? AS jsonb))",
                value.applicationId(),owner,value.clientRequestId(),hash,java.sql.Timestamp.from(value.appliedAt()),json.writeValueAsString(value));
    }
}
